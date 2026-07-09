import React, { cloneElement } from "react"
import PropTypes from "prop-types"

import {parseSearch, serializeSearch} from "core/utils"

const BRAND_TITLE = "API Lifecycle UI"
const LOCAL_SPEC_ALIAS = "dev-helpers/default_openapi_yaml/default_openapi_yaml_file.yaml"
const LOCAL_SPEC_PATH = "/default_openapi_yaml/default_openapi_yaml_file.yaml"

class TopBar extends React.Component {

  static propTypes = {
    layoutActions: PropTypes.object.isRequired,
    authActions: PropTypes.object.isRequired
  }

  constructor(props, context) {
    super(props, context)
    this.state = {
      url: "",
      selectedIndex: 0,
      yamlFile: null,
      yamlFileName: "No file selected"
    }
  }

  onYamlFileChange = (e) => {
    const file = e.target.files && e.target.files[0]

    this.setState({
      yamlFile: file || null,
      yamlFileName: file ? file.name : "No file selected"
    })
  }

  loadYamlFile = async (e) => {
    e.preventDefault()

    const { yamlFile } = this.state
    if (!yamlFile) {
      return
    }

    this.flushAuthData()
    this.props.specActions.updateLoadingStatus("loading")

    try {
      const yamlText = await yamlFile.text()
      this.props.specActions.updateUrl(`uploaded://${yamlFile.name}`)
      this.props.specActions.updateSpec(yamlText)
      this.props.specActions.updateLoadingStatus("success")
    } catch (error) {
      console.error(error)
      this.props.specActions.updateLoadingStatus("failed")
    }
  }

  normalizeSpecUrl = (url) => {
    if (!url) {
      return url
    }

    if (url === LOCAL_SPEC_ALIAS) {
      return LOCAL_SPEC_PATH
    }

    if (url === `/${LOCAL_SPEC_ALIAS}`) {
      return LOCAL_SPEC_PATH
    }

    if (url.startsWith("file:\\\\")) {
      const normalizedPath = url.replace(/^file:\\\\+/, "").replace(/\\/g, "/").replace(/^\/+/, "")
      if (!normalizedPath) {
        return LOCAL_SPEC_PATH
      }

      const basePath = normalizedPath.endsWith("/") ? normalizedPath.slice(0, -1) : normalizedPath
      if (basePath === "dev-helpers/default_openapi_yaml") {
        return LOCAL_SPEC_PATH
      }

      if (basePath.startsWith("dev-helpers/")) {
        return `/${basePath.slice("dev-helpers/".length)}`
      }

      return `/${basePath}`
    }

    if (url.startsWith("dev-helpers/")) {
      const normalizedPath = url.replace(/^dev-helpers\//, "")
      return `/${normalizedPath}`
    }

    return url
  }

  onUrlChange =(e)=> {
    let {target: {value}} = e
    this.setState({url: value})
  }

  flushAuthData() {
    const { persistAuthorization } = this.props.getConfigs()
    if (persistAuthorization)
    {
      return
    }
    this.props.authActions.restoreAuthorization({
      authorized: {}
    })
  }

  loadSpec = (url) => {
    const normalizedUrl = this.normalizeSpecUrl(url)

    this.flushAuthData()
    this.props.specActions.updateUrl(normalizedUrl)
    this.props.specActions.download(normalizedUrl)
  }

  onUrlSelect =(e)=> {
    let url = e.target.value || e.target.href
    this.loadSpec(url)
    this.setSelectedUrl(url)
    e.preventDefault()
  }

  downloadUrl = (e) => {
    this.loadSpec(this.state.url)
    e.preventDefault()
  }

  setSearch = (spec) => {
    let search = parseSearch()
    search["urls.primaryName"] = spec.name
    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`
    if(window && window.history && window.history.pushState) {
      window.history.replaceState(null, "", `${newUrl}?${serializeSearch(search)}`)
    }
  }

  setSelectedUrl = (selectedUrl) => {
    const configs = this.props.getConfigs()
    const urls = configs.urls || []

    if(urls && urls.length) {
      if(selectedUrl)
      {
        urls.forEach((spec, i) => {
          if(spec.url === selectedUrl)
            {
              this.setState({selectedIndex: i})
              this.setSearch(spec)
            }
        })
      }
    }
  }

  componentDidMount() {
    document.title = BRAND_TITLE

    this.loadSpec(LOCAL_SPEC_PATH)

    const configs = this.props.getConfigs()
    const urls = configs.urls || []

    if(urls && urls.length) {
      var targetIndex = this.state.selectedIndex
      let search = parseSearch()
      let primaryName = search["urls.primaryName"] || configs.urls.primaryName
      if(primaryName)
      {
        urls.forEach((spec, i) => {
          if(spec.name === primaryName)
            {
              this.setState({selectedIndex: i})
              targetIndex = i
            }
        })
      }
    }
  }

  onFilterChange =(e) => {
    let {target: {value}} = e
    this.props.layoutActions.updateFilter(value)
  }

  render() {
    let { getComponent, specSelectors, getConfigs } = this.props
    const Button = getComponent("Button")
    const Link = getComponent("Link")
    const Logo = getComponent("Logo")

    let isLoading = specSelectors.loadingStatus() === "loading"
    let isFailed = specSelectors.loadingStatus() === "failed"

    const classNames = ["download-url-input"]
    if (isFailed) classNames.push("failed")
    if (isLoading) classNames.push("loading")

    const { urls } = getConfigs()
    let control = []
    let formOnSubmit = null

    if(urls) {
      let rows = []
      urls.forEach((link, i) => {
        rows.push(<option key={i} value={link.url}>{link.name}</option>)
      })

      control.push(
        <label className="select-label" htmlFor="select"><span>Select a definition</span>
          <select id="select" disabled={isLoading} onChange={ this.onUrlSelect } value={urls[this.state.selectedIndex].url}>
            {rows}
          </select>
        </label>
      )
    }
    else {
      formOnSubmit = this.downloadUrl
      control.push(
        <input
          className={classNames.join(" ")}
          type="text"
          onChange={this.onUrlChange}
          value={this.state.url}
          disabled={isLoading}
          id="download-url-input"
        />
      )
      control.push(<Button className="download-url-button" onClick={ this.downloadUrl }>Explore</Button>)
    }

    return (
      <div className="topbar">
        <div className="wrapper">
          <div className="topbar-wrapper">
            <Link>
              <Logo/>
              <span className="topbar-brand-title">{BRAND_TITLE}</span>
            </Link>
            <form className="download-url-wrapper" onSubmit={formOnSubmit}>
              {control.map((el, i) => cloneElement(el, { key: i }))}
            </form>
            <form className="upload-yaml-wrapper" onSubmit={this.loadYamlFile}>
              <span className="upload-yaml-title">Explore YAML</span>
              <label className="upload-yaml-browse-button" htmlFor="upload-yaml-input">Browse</label>
              <input
                id="upload-yaml-input"
                className="upload-yaml-input"
                type="file"
                accept=".yaml,.yml,application/yaml,text/yaml,text/x-yaml"
                onChange={this.onYamlFileChange}
              />
              <span className="upload-yaml-file-name">{this.state.yamlFileName}</span>
              <Button
                className="upload-yaml-load-button"
                onClick={this.loadYamlFile}
                disabled={!this.state.yamlFile || isLoading}
              >
                Load YAML
              </Button>
            </form>
            <div className="topbar-user-actions" aria-hidden="true">
              <span className="sign-out">Sign Out</span>
              <span className="user-initials">AA</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

TopBar.propTypes = {
  specSelectors: PropTypes.object.isRequired,
  specActions: PropTypes.object.isRequired,
  getComponent: PropTypes.func.isRequired,
  getConfigs: PropTypes.func.isRequired
}

export default TopBar
